import { Module } from '@nestjs/common';
import { FindUserByEmailUseCase } from './app/use-cases/find-by-email.use-case';
import { FindUserByIdUseCase } from './app/use-cases/find-by-id.use-case';
import { UserRepository } from './infrastructure/repository/user.repository';
import { UserEntity } from './infrastructure/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateUserUseCase } from './app/use-cases/create-user.use-case';
import { UserController } from './infrastructure/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },

    CreateUserUseCase,
    FindUserByEmailUseCase,
    FindUserByIdUseCase,
  ],
  exports: [FindUserByEmailUseCase, FindUserByIdUseCase],
})
export class UsersModule { }
