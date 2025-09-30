import { Inject, Injectable } from "@nestjs/common";
import { RegisterUserDto } from "src/auth/app/dto/register.dto";
import { UserRepository } from "src/users/infrastructure/repository/user.repository";
const bcrypt = require('bcrypt');

@Injectable()
export class CreateUserUseCase {
    constructor(
        @Inject('IUserRepository')
        private readonly userRepository: UserRepository,
    ) { }

    async execute(userData: RegisterUserDto) {

        const saltRounds = 10;
        userData.password = await bcrypt.hash(userData.password!, saltRounds);
   
        const user = await this.userRepository.create(userData);
        return user;

    }
}