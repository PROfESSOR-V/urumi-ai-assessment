
import { exec } from 'child_process';
import { promisify } from 'util';
import * as k8s from '@kubernetes/client-node';

const execAsync = promisify(exec);

export class K8sService {
    private k8sApi: k8s.CoreV1Api;
    private k8sAppsApi: k8s.AppsV1Api;
    private networkingApi: k8s.NetworkingV1Api;

    constructor() {
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        this.k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
        this.networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
    }

    async createNamespace(name: string) {
        try {
            const ns = {
                metadata: {
                    name: name
                }
            };
            // @ts-ignore 
            // kubectl get ns | grep store
            await this.k8sApi.createNamespace({ body: ns });
            console.log(`Namespace ${name} created.`);

            await this.applyNamespacePolicies(name);
        } catch (err: any) {
            console.error('Create Namespace Error:', err.body || err);
        }
    }

    async applyNamespacePolicies(namespace: string) {
        try {
            const quota = {
                metadata: { name: 'store-quota', namespace },
                spec: { hard: { 'pods': '20', 
                    'requests.cpu': '2', 
                    'requests.memory': '4Gi', 
                    'limits.cpu': '4', 
                    'limits.memory': '8Gi' 
                } }
            };
            // @ts-ignore
            await this.k8sApi.createNamespacedResourceQuota({ namespace, body: quota });

            // LimitRange
            const limitRange = {
                apiVersion: 'v1',
                kind: 'LimitRange',
                metadata: { name: 'store-limit-range', namespace },
                spec: {
                    limits: [{
                        type: 'Container',
                        default: { cpu: '500m', memory: '512Mi' },
                        defaultRequest: { cpu: '100m', memory: '128Mi' }
                    }]
                }
            };
            // @ts-ignore
            await this.k8sApi.createNamespacedLimitRange({ namespace, body: limitRange });

            // NetworkPolicy
            const netPol = {
                apiVersion: 'networking.k8s.io/v1',
                kind: 'NetworkPolicy',
                metadata: { name: 'default-deny-ingress', namespace },
                spec: {
                    podSelector: {},
                    policyTypes: ['Ingress'],
                    ingress: [
                        {
                            from: [
                                { namespaceSelector: { matchLabels: { 'kubernetes.io/metadata.name': 'ingress-nginx' } } },
                                { podSelector: {} }
                            ]
                        }
                    ]
                }
            };
            // @ts-ignore
            await this.networkingApi.createNamespacedNetworkPolicy({ namespace, body: netPol });

            console.log(`Isolation policies applied to ${namespace}`);

        } catch (error: any) {
            console.error('Apply Policies Error:', error.body || error);
        }
    }


    async deleteNamespace(name: string) {
        try {
            // @ts-ignore
            await this.k8sApi.deleteNamespace({ name });
            console.log(`Namespace ${name} deleted.`);
        } catch (err: any) {
            console.error(`Error deleting namespace ${name}:`, err.message);
        }
    }

    async installHelmChart(namespace: string, releaseName: string, valuesPath: string, dbPassword: string, storeName: string) {
        const chartPath = '../charts/woocommerce-store';
        const safeStoreName = storeName.replace(/"/g, '\\"');

        const setValues = [
            `wordpress.mariadb.auth.rootPassword=${dbPassword}`,
            `wordpress.mariadb.auth.password=${dbPassword}`,
            `wordpress.ingress.enabled=true`,
            `wordpress.ingress.className=nginx`,
            `wordpress.ingress.hostname=${releaseName}.localhost`,
            `wordpress.ingress.path=/`,
            `wordpress.ingress.pathType=Prefix`,
            `wordpress.wordpressBlogName="${safeStoreName}"`
        ].join(' --set ');

        const command = `helm upgrade --install ${releaseName} ${chartPath} --namespace ${namespace} --values ${valuesPath} --set ${setValues} --wait --timeout 10m`;
        console.log(`Executing: ${command.replace(dbPassword, '*****').replace(dbPassword, '*****')}`);

        try {
            const { stdout, stderr } = await execAsync(command);
            console.log('Helm Output:', stdout);
            if (stderr) console.error('Helm Stderr:', stderr);

            await this.configureStoreSettings(namespace, releaseName, storeName);
            return true;
        } catch (error: any) {
            console.error('Helm Execution Failed:', error.message);
            throw error;
        }
    }

    async configureStoreSettings(namespace: string, releaseName: string, storeName: string) {
        console.log(`Configuring store settings for ${releaseName} in ${namespace}...`);

        if (!namespace) {
            console.error('configureStoreSettings: Namespace check failed');
            return;
        }

        const maxRetries = 60;
        const retryDelay = 5000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                // @ts-ignore
                const podList = await this.k8sApi.listNamespacedPod({
                    namespace,
                    labelSelector: `app.kubernetes.io/instance=${releaseName},app.kubernetes.io/name=wordpress`
                });

                // @ts-ignore
                const items = podList.items || podList.body?.items || [];

                if (items.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                const podName = items[0]?.metadata?.name;
                const phase = items[0]?.status?.phase;

                if (!podName || phase !== 'Running') {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                const safeStoreName = (storeName || "Ecom Shop").replace(/"/g, '\\"');

                // Use ; to run sequentially even if one fails. Or || true.
                const script = `
                    wp option update users_can_register 1 --allow-root || true;
                    wp option update blogname "${safeStoreName}" --allow-root || true;
                    wp plugin activate woocommerce --allow-root || true;
                    wp wc payment_gateway update cod --enabled=true --user=1 --allow-root || true;
                    wp wc product create --name="Demo Product" --type=simple --regular_price=100 --description="A sample product" --user=1 --allow-root || true;
                    wp theme install storefront --activate --allow-root || true;
                    wp option update woocommerce_enable_signup_and_login_from_checkout yes --allow-root || true;
                    wp option update woocommerce_enable_myaccount_registration yes --allow-root || true
                `;

                const collapsedScript = script.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
                const cmd = `kubectl exec -n ${namespace} ${podName} -- sh -c '${collapsedScript}'`;

                await execAsync(cmd);
                console.log('Store settings configured successfully.');
                return;

            } catch (error: any) {
                console.error(`Attempt ${i + 1} failed:`, error.message || error.body);
                if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        console.error('Failed to configure store settings after retries.');
    }

    async getAdminPassword(namespace: string, releaseName: string): Promise<string | null> {
        try {
            const secretName = `${releaseName}-wordpress`;
            // @ts-ignore
            const secret = await this.k8sApi.readNamespacedSecret({ name: secretName, namespace });

            // @ts-ignore
            const data = secret.data || secret.body?.data;

            if (!data) {
                console.log(`Debug: No data in secret ${secretName}`);
                return null;
            }

            if (data['wordpress-password']) {
                return Buffer.from(data['wordpress-password'], 'base64').toString('utf-8');
            } else {
                console.log(`Debug: wordpress-password key missing in ${secretName}. Keys: ${Object.keys(data)}`);
            }
            return null;
        } catch (error) {
            console.error(`Debug: getAdminPassword error for ${releaseName}:`, error);
            return null;
        }
    }

    async getStoreStatus(namespace: string, releaseName: string) {
        try {
            // @ts-ignore
            const res = await this.k8sApi.listNamespacedPod({
                namespace,
                labelSelector: `app.kubernetes.io/instance=${releaseName}`
            });

            // @ts-ignore
            const pods = res.items || res.body?.items || [];

            if (!pods.length) return 'Pending';
            if (pods.every((p: any) => p.status?.phase === 'Running')) return 'Ready';
            if (pods.some((p: any) => p.status?.phase === 'Failed')) return 'Failed';
            return 'Provisioning';
        } catch (error) {
            console.error('getStoreStatus Error:', error);
            return 'Pending';
        }
    }
}
