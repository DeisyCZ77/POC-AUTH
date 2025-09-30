import {
    Injectable
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { User } from '../../domain/user.model';
import { Repository } from 'typeorm';
import { IUserRepository } from 'src/users/domain/user.repository';

@Injectable()
export class UserRepository implements IUserRepository {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userEntityRepository: Repository<UserEntity>,
    ) { }

    async findById(id: string): Promise<User | null> {
        return this.userEntityRepository.findOne({
            where: { id },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userEntityRepository.findOne({
            where: { email },
        });
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.userEntityRepository.create(userData);
        return this.userEntityRepository.save(user);
    }
}
