import { 
    Router 
} from 'express';

import { 
    createStore, 
    listStores, 
    deleteStore, 
    getStore 
} from '../controllers/storeController.js';

const router = Router();

router.post('/', createStore);
router.get('/', listStores);
router.get('/:id', getStore);
router.delete('/:id', deleteStore);

export default router;
