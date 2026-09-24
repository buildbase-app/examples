// Modified from brocoders/nestjs-boilerplate: seeded users have no password.
// They sign in through BuildBase and are matched by email the first time.
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserSchemaClass } from '../../../../users/infrastructure/persistence/document/entities/user.schema';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly model: Model<UserSchemaClass>,
  ) {}

  async run() {
    const admin = await this.model.findOne({
      email: 'admin@example.com',
    });

    if (!admin) {
      const data = new this.model({
        email: 'admin@example.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: {
          _id: RoleEnum.admin.toString(),
        },
        status: {
          _id: StatusEnum.active.toString(),
        },
      });
      await data.save();
    }

    const user = await this.model.findOne({
      email: 'john.doe@example.com',
    });

    if (!user) {
      const data = new this.model({
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: {
          _id: RoleEnum.user.toString(),
        },
        status: {
          _id: StatusEnum.active.toString(),
        },
      });

      await data.save();
    }
  }
}
