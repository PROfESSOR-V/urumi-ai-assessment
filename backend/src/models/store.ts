
import { Sequelize, DataTypes, Model } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false
});

export class Store extends Model {
    public id!: number;
    public name!: string;
    public subdomain!: string;
    public status!: string;
    public namespace!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Store.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subdomain: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    namespace: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Pending', // Pending, Provisioning, Ready, Failed
    },
}, {
    sequelize,
    tableName: 'stores',
});

export const initDB = async () => {
    await sequelize.sync();
};

export default sequelize;
