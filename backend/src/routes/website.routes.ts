import { Router } from "express";
import { activateSubscription, addWebsite, deactivateSubscription, getUserWebsites, getUserWebsite } from "../controllers";
import { authMiddleware } from "../middlewares";

const router = Router();

router.route('/').post(authMiddleware, addWebsite)
router.route('/').get(authMiddleware, getUserWebsites)
router.route('/:id').get(authMiddleware, getUserWebsite)
router.route('/:id/deactivate').patch(authMiddleware, deactivateSubscription)
router.route('/:id/activate').patch(authMiddleware, activateSubscription)

export {router as websiteRouter}