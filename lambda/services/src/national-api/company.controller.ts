import { Controller, Get, Query, UseGuards, Request, Post, Put, HttpException, HttpStatus, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Company } from '../shared/entities/company.entity';
import { Action } from '../shared/casl/action.enum';
import { PoliciesGuardEx } from '../shared/casl/policy.guard';
import { QueryDto } from '../shared/dto/query.dto';
import { CompanyService } from '../shared/company/company.service';
import { CaslAbilityFactory } from '../shared/casl/casl-ability.factory';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';

@ApiTags('Company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {

    constructor(private readonly companyService: CompanyService, private caslAbilityFactory: CaslAbilityFactory) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PoliciesGuardEx(true, Action.Read, Company, true))
    @Post('query')
    queryUser(@Body()query: QueryDto, @Request() req) {
      console.log(req.abilityCondition)
      return this.companyService.query(query, req.abilityCondition)
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PoliciesGuardEx(true, Action.Update, Company))
    @Put('suspend')
    suspend(@Query('id') companyId: number, @Request() req) {
        if (companyId == req.user.companyId) {
            throw new HttpException("Can not suspend your own company", HttpStatus.FORBIDDEN)
        }
        return this.companyService.suspend(companyId, req.abilityCondition)
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PoliciesGuardEx(true, Action.Update, Company))
    @Put('activate')
    revoke(@Query('id') companyId: number, @Request() req) {
        if (companyId == req.user.companyId) {
            throw new HttpException("Can not activate your own company", HttpStatus.FORBIDDEN)
        }
        return this.companyService.activate(companyId, req.abilityCondition)
    }
}
