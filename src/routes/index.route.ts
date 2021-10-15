import { Router } from "express";
import { arweaveController } from "../controllers/arweave.controller";
import { indexController } from "../controllers/index.controller";

//export default IndexRoute;

const router = Router();

router.get("/", indexController);
router.get("/arweave", arweaveController);

export default router;
