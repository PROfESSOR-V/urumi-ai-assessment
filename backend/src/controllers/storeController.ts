import { Request, Response } from 'express';
import { Store } from '../models/store.js';
import { AuditLog } from '../models/auditLog.js';
import { K8sService } from '../services/k8s.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const k8sService = new K8sService();

export const createStore = async (req: Request, res: Response) => {
    const { name, subdomain } = req.body;

    // Basic validation
    if (!name || !subdomain) {
        return res.status(400).json({ error: 'Name and subdomain are required' });
    }

    try {
        // Check uniqueness
        const existing = await Store.findOne({ where: { subdomain } });
        if (existing) {
            return res.status(409).json({ error: 'Subdomain already taken' });
        }

        const namespace = `store-${subdomain}`;

        // Create DB record
        const store = await Store.create({
            name,
            subdomain,
            namespace,
            status: 'Provisioning'
        });

        await AuditLog.create({
            action: 'CREATE',
            resource: `Store:${subdomain}`,
            details: `Created store ${name}`
        });

        // Trigger provisioning asynchronously
        provisionStore(store);

        return res.status(201).json(store);
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const provisionStore = async (store: Store) => {
    try {
        console.log(`Provisioning store ${store.name} in namespace ${store.namespace}...`);

        // 1. Create Namespace
        await k8sService.createNamespace(store.namespace);

        // 2. Install Chart
        const env = process.env.NODE_ENV || 'local';
        const valuesFile = env === 'production' ? 'values-prod.yaml' : 'values-local.yaml';
        const valuesPath = path.resolve(__dirname, `../../../charts/woocommerce-store/${valuesFile}`);

        // Generate random password
        const dbPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        await k8sService.installHelmChart(store.namespace, store.subdomain, valuesPath, dbPassword, store.name);

        // Update status
        store.status = 'Ready';
        await store.save();
        console.log(`Store ${store.name} provisioned.`);

    } catch (error) {
        console.error(`Provisioning failed for ${store.name}:`, error);
        store.status = 'Failed';
        await store.save();
    }
};

export const listStores = async (req: Request, res: Response) => {
    try {
        const stores = await Store.findAll();

        // Sync status with K8s and fetch passwords
        const enrichedStores = await Promise.all(stores.map(async (store) => {
            const storeData = store.toJSON() as any;

            if (store.namespace) {
                // Sync Status
                const currentStatus = await k8sService.getStoreStatus(store.namespace, store.subdomain);
                if (currentStatus && store.status !== currentStatus) {
                    store.status = currentStatus;
                    await store.save();
                    storeData.status = currentStatus;
                }

                // Fetch Password if Ready
                if (storeData.status === 'Ready') {
                    const password = await k8sService.getAdminPassword(store.namespace, store.subdomain);
                    if (password) {
                        storeData.adminPassword = password;
                    }
                }
            }
            return storeData;
        }));

        return res.json(enrichedStores);
    } catch (error) {
        console.error('List stores error:', error);
        return res.status(500).json({ error: 'Failed to list stores' });
    }
};

export const deleteStore = async (req: Request, res: Response) => {
    const params = req.params as { id: string };
    const { id } = params;
    try {
        const store = await Store.findByPk(parseInt(id));
        if (!store) return res.status(404).json({ error: 'Store not found' });

        // Delete from K8s
        await k8sService.deleteNamespace(store.namespace);

        // Delete from DB
        await store.destroy();

        await AuditLog.create({
            action: 'DELETE',
            resource: `Store:${store.subdomain}`,
            details: 'Store deleted'
        });

        return res.json({ message: 'Store deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Delete failed' });
    }
};

export const getStore = async (req: Request, res: Response) => {
    const params = req.params as { id: string };
    const { id } = params;
    try {
        const store = await Store.findByPk(parseInt(id));
        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }
        res.json(store);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch store" });
    }
};
