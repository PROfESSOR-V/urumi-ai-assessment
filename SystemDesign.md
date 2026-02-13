
# System Design: Urumi Store Provisioning Platform

## 1. Overview
The **Urumi Store Provisioning Platform** allows dynamic, on-demand creation of isolated e-commerce environments (Woocommerce stores) on a Kubernetes cluster. It provides a centralized control plane for managing the lifecycle of these stores (Create, List, Delete) while enforcing strict multi-tenant isolation.

## 2. Architecture

### 2.1 High-Level Diagram
```mermaid
graph TD
    User[User] -->|Access Dashboard| Frontend[React Dashboard]
    Frontend -->|API Requests| Backend[Node.js Control Plane]
    
    subgraph "Kubernetes Cluster"
        Backend -->|K8s API / Helm| K8sApi[K8s API Server]
        
        subgraph "Namespace: store-shop1"
            Pod1[WordPress+WooCommerce Pod]
            PodDb1[MariaDB Pod]
            Svc1[Service]
            Ing1[Ingress]
            NP1[NetworkPolicy]
            RQ1[ResourceQuota]
        end
        
        subgraph "Namespace: store-shop2"
            Pod2[WordPress+WooCommerce Pod]
            PodDb2[MariaDB Pod]
            Svc2[Service]
            Ing2[Ingress]
            NP2[NetworkPolicy]
            RQ2[ResourceQuota]
        end
        
        IngressController[Ingress Controller] -->|Routes Domain| Ing1
        IngressController -->|Routes Domain| Ing2
    end
    
    Backend -->|Persists State| DB[(SQLite/Postgres)]
```

### 2.2 Components

#### Frontend (Control Plane Dashboard)
- **Tech Stack:** React, Vite, Tailwind CSS.
- **Function:** UI for users to view their stores and provision new ones.
- **Communication:** Polls the Backend API for status updates.

#### Backend (Control Plane API)
- **Tech Stack:** Node.js, Express, Sequelize, @kubernetes/client-node.
- **Responsibilities:**
  - **State Management:** Tracks store metadata (name, subdomain, status) in a relational database.
  - **Orchestration:** Calls Kubernetes API to create Namespaces and apply policies.
  - **Provisioning:** Executes Helm commands (or uses Helm SDK) to deploy the WooCommerce stack.
  - **Audit Logging:** Records all lifecycle events (Create/Delete) for compliance.

#### Infrastructure (Kubernetes)
- **Isolation Strategy:** Hard multi-tenancy using Namespaces.
- **Resource Management:** `ResourceQuota` limits CPU/Memory per tenant. `LimitRange` sets default container sizes.
- **Network Security:** `NetworkPolicy` explicitly denies all ingress traffic from other namespaces, allowing only traffic from the Ingress Controller and intra-namespace communication.

## 3. Data Flow

### 3.1 Provisioning Flow
1. **Request:** User submits "Create Store" (Name: "My Shop", Subdomain: "shop1").
2. **Validation:** Backend checks if "shop1" is unique in DB.
3. **Record:** Backend creates a `Store` record with status `Provisioning`.
4. **Step 1 - Namespace:** Backend creates `Namespace: store-shop1`.
5. **Step 2 - Policies:** Backend applies `ResourceQuota`, `LimitRange`, and `NetworkPolicy` to the namespace.
6. **Step 3 - Deploy:** Backend triggers Helm install of `woocommerce-store` chart.
7. **Polling:** Frontend polls API. Backend checks K8s Pod status.
8. **Completion:** When Pods run, Backend updates DB status to `Ready`. Frontend shows "Visit" link.

## 4. Security & Scalability

### Security
- **Isolation:** Critical. Each store is unaware of others.
- **Minimal Privilege:** The Backend ServiceAccount should only have permission to manage specific namespaces (in a real prod setup).
- **Audit:** All actions are logged.

### Scalability
- **Horizontal Scaling:** The stateless Backend can be scaled. The Database can be migrated to managed Postgres.
- **Cluster Autobcaling:** Kubernetes Cluster Autoscaler will add nodes as new Stores claim resources.

## 5. Future Improvements
- **Authentication:** Add User Auth (Auth0/Cognito) to Control Plane.
- **Monitoring:** Prometheus/Grafana integration for per-tenant metrics.
- **Billing:** Integrate Stripe based on active store time.
