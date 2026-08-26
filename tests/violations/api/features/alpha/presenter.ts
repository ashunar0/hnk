// no-foreign-repository: 他 feature の storage に手を伸ばしている
import { betaRepository } from "../beta/repository";

export const toAlpha = () => betaRepository;
