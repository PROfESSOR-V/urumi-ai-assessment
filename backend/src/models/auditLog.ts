
import { Sequelize, DataTypes, Model } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import sequelize from './store.js';

export class AuditLog extends Model {
    public id!: number;
    public action!: string;
    public resource!: string; // e.g. "Store:my-store"
    public details!: string;
    public readonly createdAt!: Date;
}

export const initAuditLog = () => {
    AuditLog.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        resource: {
            type: DataTypes.STRING,
            allowNull: false
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        tableName: 'audit_logs',
        updatedAt: false // Immutable logs
    });
};
