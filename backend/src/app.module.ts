import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { IamModule } from './iam/infrastructure/iam.module';


@Module({
  imports: [PrismaModule, IamModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
