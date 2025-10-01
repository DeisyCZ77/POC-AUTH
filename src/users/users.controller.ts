// src/users/users.controller.ts
import { Controller, Get, Patch, Body, Delete, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../auth/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  // Public endpoint - no authentication required
  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public data' };
  }

  // Protected endpoint - requires authentication
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
    };
  }

  // Admin only endpoint
  @Roles('admin')
  @Get()
  getAllUsers() {
    return { message: 'List of all users - admin only' };
  }

  // Admin or moderator endpoint
  @Roles('admin', 'moderator')
  @Delete(':id')
  deleteUser(@Param('id') id: string, @CurrentUser() user: User) {
    return { 
      message: `User ${id} deleted by ${user.email}`,
      deletedBy: user.id 
    };
  }

  // User can update their own profile
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateDto: { firstName?: string; lastName?: string },
  ) {
    return {
      message: 'Profile updated',
      userId: user.id,
      updates: updateDto,
    };
  }
}