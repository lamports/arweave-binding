import { Router } from "express";
import { indexController } from "../controllers/index.controller";

//export default IndexRoute;

const router = Router();

router.get("/", indexController);

export default router;
