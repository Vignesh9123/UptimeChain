import { Router } from "express";
import { userRouter } from "./user.routes";
import { websiteRouter } from "./website.routes";
import { pingRouter } from "./ping.routes";
import { validatorRouter } from "./validator.routes";
const router = Router()

router.use('/users', userRouter)
router.use('/websites', websiteRouter)
router.use('/ping', pingRouter)
router.use('/validators', validatorRouter)

export default router