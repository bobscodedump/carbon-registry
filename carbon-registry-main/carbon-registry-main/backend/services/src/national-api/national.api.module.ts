import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NationalAPIController } from './national.api.controller';
import { NationalAPIService } from './national.api.service';
import { GhgInventoryModule, configuration } from "carbon-services-lib_ci";
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from 'carbon-services-lib_ci';
// import { Programme } from './entities/programme.entity';
import { AuthModule ,CompanyModule,UserModule,UtilModule,CaslModule} from "carbon-services-lib_ci";
import { ProgrammeModule } from 'carbon-services-lib_ci';
import { CompanyController } from './company.controller';
import { UserController } from './user.controller';
import { AuthController } from './auth.controller';
import { ProgrammeController } from './programme.controller';
import { SettingsController } from './settings.controller';
import { GHGEmissionController } from './ghg,emission.controller';
import { GHGProjectionController } from './ghg,projection.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration.default],
      envFilePath: [`.env.${process.env.NODE_ENV}`, `.env`]
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      imports: undefined
    }),
    AuthModule,
    UserModule,
    CaslModule,
    ProgrammeModule,
    CompanyModule,
    UtilModule,
    GhgInventoryModule
  ],
  controllers: [ NationalAPIController, UserController, AuthController, CompanyController, ProgrammeController, SettingsController, GHGEmissionController, GHGProjectionController ],
  providers: [
    NationalAPIService, 
    Logger
  ],
})
export class NationalAPIModule {}
