import express, { Router } from 'express';
import { 
    createProposal, 
    chooseAdvisor, 
    getStudentAdvisorInfo,
    trainModel,
/*     postUploadManuscript */
} from '../controllers/studentControllers';

const router: Router = express.Router();

router.post('/submit-proposal', createProposal);
router.post('/choose-advisor', chooseAdvisor);
router.get('/student-advisor-info/:userId', getStudentAdvisorInfo);
router.post('/train-model', trainModel);
/* router.post('/upload-manuscript', postUploadManuscript); */

export default router;
