import {
  Controller,
  Get,
  Logger,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { StatList } from "../shared/dto/stat.list.dto";
import { ApiKeyJwtAuthGuard } from "../shared/auth/guards/api-jwt-key.guard";
import { Action } from "../shared/casl/action.enum";
import { PoliciesGuardEx } from "../shared/casl/policy.guard";
import { AnalyticsAPIService } from "./analytics.api.service";
import { Stat } from "../shared/dto/stat.dto";

@ApiTags("Programme")
@ApiBearerAuth()
@Controller("programme")
export class ProgrammeController {
  constructor(
    private analyticsService: AnalyticsAPIService,
    private readonly logger: Logger
  ) {}

  @ApiBearerAuth()
  @UseGuards(
    ApiKeyJwtAuthGuard,
    PoliciesGuardEx(true, Action.Read, Stat, true, true)
  )
  // @UseGuards(JwtAuthGuard, PoliciesGuardEx(true, Action.Read, User, true))
  @Post("stats")
  async programmesStaticDetails(@Body()query: StatList, @Request() req) {
    return this.analyticsService.programmesStaticDetails(
      req.abilityCondition,
      query
    );
  }
}