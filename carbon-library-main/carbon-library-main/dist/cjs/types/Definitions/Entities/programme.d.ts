import { BaseEntity } from "./baseEntity";
export declare class ProgrammeEntity implements BaseEntity {
    programmeId?: string;
    serialNo?: string;
    title?: string;
    externalId?: string;
    currentStage?: string;
    typeOfMitigation?: string;
    certifierId?: number[];
    companyId?: number[];
}
