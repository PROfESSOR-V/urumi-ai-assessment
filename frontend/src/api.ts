import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

export const getStores = async () => {
    const response = await api.get('/stores');
    return response.data;
};

export const createStore = async (data: { name: string; subdomain: string }) => {
    const response = await api.post('/stores', data);
    return response.data;
};

export const deleteStore = async (id: number) => {
    const response = await api.delete(`/stores/${id}`);
    return response.data;
};
