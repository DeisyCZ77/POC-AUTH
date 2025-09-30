import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpException,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { CreateUserUseCase } from '../app/use-cases/create-user.use-case';
import { RegisterUserDto } from 'src/auth/app/dto/register.dto';
import { FindUserByIdUseCase } from '../app/use-cases/find-by-id.use-case';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly findUserById: FindUserByIdUseCase,
  ) { }

  @Post('')
  @HttpCode(201)
  async create(@Body() createUserDto: RegisterUserDto) {
    try {
      return await this.createUser.execute(createUserDto);
    } catch (error) {
      this.handleError(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.findUserById.execute(id);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error instanceof HttpException) throw error;

    console.error(error);

    throw new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
