
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import storeRoutes from './routes/storeRoutes.js';
import { initDB } from './models/store.js';
import { initAuditLog } from './models/auditLog.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/stores', storeRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const startServer = async () => {
    try {
        initAuditLog();
        await initDB();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

startServer();
