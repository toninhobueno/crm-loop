import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as BackofficeAuditController from "../controllers/BackofficeAuditController";

const backofficeRoutes = Router();

backofficeRoutes.get(
  "/backoffice/audit-summary",
  isAuth,
  BackofficeAuditController.auditSummary
);

export default backofficeRoutes;
