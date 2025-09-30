import { Inject, Injectable } from "@nestjs/common";
import { User } from "src/users/domain/user.model";
import { UserRepository } from "src/users/infrastructure/user.repository";

@Injectable()
export class FindUserByIdUseCase {
    constructor(
        @Inject('IUserRepository')
        private readonly userRepository: UserRepository,
    ) { }
    async execute(id: string): Promise<User | null> {
        return this.userRepository.findById(id);
    }
}