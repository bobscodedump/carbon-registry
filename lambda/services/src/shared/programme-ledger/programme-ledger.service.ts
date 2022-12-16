import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PRECISION } from "carbon-credit-calculator/dist/esm/calculator";
import { plainToClass } from "class-transformer";
import { dom } from "ion-js";
import { generateSerialNumber } from "serial-number-gen";
import { ProgrammeHistoryDto } from "../dto/programme.history.dto";
import { ProgrammeTransferApprove } from "../dto/programme.transfer.approve";
import { CreditOverall } from "../entities/credit.overall.entity";
import { Programme } from "../entities/programme.entity";
import { ProgrammeTransfer } from "../entities/programme.transfer";
import { TxType } from "../enum/txtype.enum";
import { LedgerDbService } from "../ledger-db/ledger-db.service";
import { ProgrammeStage } from "./programme-status.enum";

@Injectable()
export class ProgrammeLedgerService {
  constructor(
    private readonly logger: Logger,
    private ledger: LedgerDbService  ) {}

  public async createProgramme(programme: Programme): Promise<Programme> {
    this.logger.debug("Creating programme", JSON.stringify(programme));
    // if (programme) {
    //   await this.entityManger.save<Programme>(
    //     plainToClass(Programme, programme)
    //   ).then((res: any) => {
    //     console.log("create programme in repo -- ", res)
    //   }).catch((e: any) => {
    //     console.log("create programme in repo -- ", e)
    //   });
    // }
    await this.ledger.insertRecord(programme);
    return programme;
  }

  public async transferProgramme(transfer: ProgrammeTransfer, approve: ProgrammeTransferApprove) {
    this.logger.log(`Transfer programme ${JSON.stringify(transfer)} ${JSON.stringify(approve)}`);

    const getQueries = {};
    getQueries[`history(${this.ledger.tableName})`] = {
      'data.programmeId': transfer.programmeId,
      'data.txRef': transfer.requestId,
    };
    getQueries[this.ledger.tableName] = {
      programmeId: transfer.programmeId,
    };

    getQueries[this.ledger.companyTableName] = {
      txId: transfer.companyId.map(e => Number(e)).concat([transfer.requesterId]),
    };
    let updatedProgramme = undefined;
    const resp = await this.ledger.getAndUpdateTx(
      getQueries,
      (results: Record<string, dom.Value[]>) => {

        const alreadyProcessed = results[`history(${this.ledger.tableName})`];
        if (alreadyProcessed.length > 0) {
          throw new HttpException(
            "Programme transfer request already processed",
            HttpStatus.BAD_REQUEST
          );
        }
        const programmes: Programme[] = results[this.ledger.tableName].map(
          (domValue) => {
            return plainToClass(
              Programme,
              JSON.parse(JSON.stringify(domValue))
            );
          }
        );
        if (programmes.length <= 0) {
          throw new HttpException(
            "Programme does not exist",
            HttpStatus.BAD_REQUEST
          );
        }

        if (programmes.length <= 0) {
          throw new HttpException(
            `Project does not exist ${transfer.programmeId}`,
            HttpStatus.BAD_REQUEST
          );
        }
        const programme = programmes[0];

        if (programme.creditOwnerPercentage && !approve.companyCredit) {
          throw new HttpException(`Must define each company credit since the programme owned by multiple companies`, HttpStatus.BAD_REQUEST);
        }

        if (programme.creditBalance < transfer.creditAmount) {
          throw new HttpException(
            `Not enough credits to full fill the transfer request in project ${transfer.programmeId}. Requests: ${transfer.creditAmount} Available: ${programme.creditBalance}`,
            HttpStatus.BAD_REQUEST
          );
        }
        
        let companyCreditBalances = {}
        const companies = results[this.ledger.companyTableName].map(
          (domValue) => {
            return plainToClass(
              CreditOverall,
              JSON.parse(JSON.stringify(domValue))
            );
          }
        );
        for (const company of companies) {
          companyCreditBalances[company.txId] = company.credit
        }

        let companyCreditDistribution = {}
        if (approve.companyCredit && programme.creditOwnerPercentage) {
          if (programme.companyId.length != approve.companyIds.length) {
            throw new HttpException(
              `Does not defined percentages for all companies`,
              HttpStatus.BAD_REQUEST
            );
          }

          const companyIds = []
          const percentages = []
          const currentCredit = {}
          for (const i in programme.creditOwnerPercentage) {
            currentCredit[programme.companyId[i]] = programme.creditBalance * programme.creditOwnerPercentage[i]/100
          }
          for (const i in approve.companyCredit) {
            const changeCredit = approve.companyCredit[i];
            if (!currentCredit[approve.companyIds[i]] || currentCredit[approve.companyIds[i]] < changeCredit){
              throw new HttpException(
                `Company ${approve.companyIds[i]} is not an owner company of the programme`,
                HttpStatus.BAD_REQUEST
              );
            }
            companyIds.push(approve.companyIds[i])
            companyCreditDistribution[approve.companyIds[i]] = -changeCredit
            percentages.push(this.round2Precision((currentCredit[approve.companyIds[i]] - changeCredit)*100/(programme.creditBalance - transfer.creditAmount)))
          }

          programme.creditOwnerPercentage = percentages;
          this.logger.verbose('Updated owner percentages', percentages)
          programme.companyId = companyIds;
        } else if (programme.companyId.length == 1) {
          companyCreditDistribution[programme.companyId[0]] = -transfer.creditAmount;
        } else {
          throw new HttpException(
            "Unexpected programme owner percentages",
            HttpStatus.BAD_REQUEST
          );
        }

        companyCreditDistribution[transfer.requesterId] = transfer.creditAmount;
       
        programme.txTime = new Date().getTime();
        programme.txRef = `${transfer.requestId}`;
        programme.creditChange = transfer.creditAmount;
        programme.creditBalance -= transfer.creditAmount;

        if (!programme.creditTransferred) {
          programme.creditTransferred = 0
        }
        programme.creditTransferred += transfer.creditAmount;

        if (programme.creditBalance <= 0) {
          programme.currentStage = ProgrammeStage.TRANSFERRED;
        }
        
        updatedProgramme = programme;
        const uPayload  = {
          txTime: programme.txTime,
          txRef: programme.txRef,
          creditChange: programme.creditChange,
          creditBalance: programme.creditBalance,
          companyId: programme.companyId,
          currentStage: programme.currentStage
        }

        if (programme.creditOwnerPercentage) {
          uPayload['creditOwnerPercentage'] = programme.creditOwnerPercentage
        }

        let updateMap = {};
        let updateWhereMap = {};
        let insertMap = {}
        updateMap[this.ledger.tableName] = uPayload;
        updateWhereMap[this.ledger.tableName] = {
          programmeId: programme.programmeId,
          currentStage: ProgrammeStage.ISSUED.valueOf(),
        };

        for (const com of programme.companyId.concat([transfer.requesterId])) {

          if (companyCreditBalances[com]) {
            updateMap[this.ledger.companyTableName + "#" + com] = {
              credit: this.round2Precision(companyCreditBalances[com] + companyCreditDistribution[com]),
              txRef: transfer.requestId + '#' + programme.serialNo,
              txType: TxType.TRANSFER
            };
            updateWhereMap[this.ledger.companyTableName + "#" + com] = {
              txId: com,
            };
          } else {
            insertMap[this.ledger.companyTableName + "#" + com] = {
              credit: this.round2Precision(companyCreditDistribution[com]),
              txRef: transfer.requestId + '#' + programme.serialNo,
              txType: TxType.TRANSFER,
              txId: com
            }
          }
        }


        return [updateMap, updateWhereMap, insertMap];
      }
    );

    const affected = resp[this.ledger.tableName];
    if (affected && affected.length > 0) {
      return updatedProgramme;
    }
    return updatedProgramme;
  }

  public async getProgrammeById(programmeId: string): Promise<Programme> {
    const p = (
      await this.ledger.fetchRecords({
        programmeId: programmeId,
      })
    ).map((domValue) => {
      return plainToClass(Programme, JSON.parse(JSON.stringify(domValue)));
    });
    return p.length <= 0 ? null : p[0];
  }

  public async getProgrammeHistory(
    programmeId: string
  ): Promise<ProgrammeHistoryDto[]> {
    return (
      await this.ledger.fetchHistory({
        programmeId: programmeId,
      })
    )?.map((domValue) => {
      return plainToClass(
        ProgrammeHistoryDto,
        JSON.parse(JSON.stringify(domValue))
      );
    });
  }

  public async updateProgrammeStatus(
    programmeId: string,
    status: ProgrammeStage,
    currentExpectedStatus: ProgrammeStage
  ): Promise<boolean> {
    this.logger.log(`Updating programme ${programmeId} status ${status}`);
    const affected = await this.ledger.updateRecords(
      {
        currentStage: status.valueOf(),
        txTime: new Date().getTime()
      },
      {
        programmeId: programmeId,
        currentStage: currentExpectedStatus.valueOf(),
      }
    );
    if (affected && affected.length > 0) {
      return true;
    }
    return false;
  }

  private round2Precision(val) {
    return parseFloat(val.toFixed(PRECISION))
  }
  public async authProgrammeStatus(
    programmeId: string,
    countryCodeA2: string,
    companyIds: number[]
  ): Promise<boolean> {
    this.logger.log(`Authorizing programme ${programmeId}`);

    const getQueries = {};
    getQueries[this.ledger.tableName] = {
      programmeId: programmeId,
      currentStage: ProgrammeStage.AWAITING_AUTHORIZATION,
    };
    getQueries[this.ledger.overallTableName] = {
      txId: countryCodeA2,
    };

    getQueries[this.ledger.companyTableName] = {
      txId: companyIds,
    };

    let updatedProgramme = undefined;
    const resp = await this.ledger.getAndUpdateTx(
      getQueries,
      (results: Record<string, dom.Value[]>) => {
        const programmes: Programme[] = results[this.ledger.tableName].map(
          (domValue) => {
            return plainToClass(
              Programme,
              JSON.parse(JSON.stringify(domValue))
            );
          }
        );
        if (programmes.length <= 0) {
          throw new HttpException(
            "Programme does not exist",
            HttpStatus.BAD_REQUEST
          );
        }

        const creditOveralls = results[this.ledger.overallTableName].map(
          (domValue) => {
            return plainToClass(
              CreditOverall,
              JSON.parse(JSON.stringify(domValue))
            );
          }
        );
        if (creditOveralls.length <= 0) {
          throw new HttpException(
            `Overall credit does not found for the country code ${countryCodeA2}`,
            HttpStatus.BAD_REQUEST
          );
        }


        let companyCreditBalances = {}
        const companies = results[this.ledger.companyTableName].map(
          (domValue) => {
            return plainToClass(
              CreditOverall,
              JSON.parse(JSON.stringify(domValue))
            );
          }
        );
        this.logger.verbose(results[this.ledger.companyTableName])
        for (const company of companies) {
          companyCreditBalances[company.txId] = company.credit
        }

        const programme = programmes[0];
        const overall = creditOveralls[0];
        const year = new Date(programme.startTime * 1000).getFullYear();
        const startBlock = overall.credit + 1;
        const endBlock = overall.credit + programme.creditIssued;
        const serialNo = generateSerialNumber(
          programme.countryCodeA2,
          programme.sectoralScope,
          programme.programmeId,
          year,
          startBlock,
          endBlock,
          programme.creditUnit
        );
        programme.serialNo = serialNo;
        programme.txTime = new Date().getTime();
        programme.currentStage = ProgrammeStage.ISSUED;
        programme.creditTransferred = 0
        updatedProgramme = programme;

        let companyCreditDistribution = {}
        if (programme.creditOwnerPercentage) {
          for (const j in programme.creditOwnerPercentage) {
            companyCreditDistribution[programme.companyId[j]] = programme.creditIssued * programme.creditOwnerPercentage[j] / 100
          }
        } else if (programme.companyId.length == 1) {
          companyCreditDistribution[programme.companyId[0]] = programme.creditIssued
        } else {
          throw new HttpException(
            "Unexpected programme owner percentages",
            HttpStatus.BAD_REQUEST
          );
        }

        let updateMap = {};
        let updateWhereMap = {};
        let insertMap = {};
        updateMap[this.ledger.tableName] = {
          currentStage: ProgrammeStage.ISSUED.valueOf(),
          serialNo: serialNo,
          creditTransferred: 0
        };
        updateWhereMap[this.ledger.tableName] = {
          programmeId: programmeId,
          currentStage: ProgrammeStage.AWAITING_AUTHORIZATION.valueOf(),
        };

        updateMap[this.ledger.overallTableName] = {
          credit: endBlock,
          txRef: serialNo,
          txType: TxType.ISSUE
        };
        updateWhereMap[this.ledger.overallTableName] = {
          txId: countryCodeA2,
        };

        for (const com of programme.companyId) {

          if (companyCreditBalances[com]) {
            updateMap[this.ledger.companyTableName + "#" + com] = {
              credit: this.round2Precision(companyCreditBalances[com] + companyCreditDistribution[com]),
              txRef: serialNo,
              txType: TxType.ISSUE
            };
            updateWhereMap[this.ledger.companyTableName + "#" + com] = {
              txId: com,
            };
          } else {
            insertMap[this.ledger.companyTableName + "#" + com] = {
              credit: this.round2Precision(companyCreditDistribution[com]),
              txRef: serialNo,
              txType: TxType.ISSUE,
              txId: com
            }
          }
         
        }
        return [updateMap, updateWhereMap, insertMap];
      }
    );

    const affected = resp[this.ledger.tableName];
    if (affected && affected.length > 0) {
      return updatedProgramme;
    }
    return updatedProgramme;
  }
}