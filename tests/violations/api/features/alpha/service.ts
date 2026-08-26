// no-foreign-service-from-service: service が他 feature を連れている
import { betaService } from "../beta/service";

export const wireAlpha = () => betaService;
