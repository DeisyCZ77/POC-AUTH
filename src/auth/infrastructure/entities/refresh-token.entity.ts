import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('refresh_tokens')
@Index(['userId', 'revoked'])  // ✅ Índice compuesto para queries
@Index(['expiresAt'])          // ✅ Índice para cleanup
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;  // ✅ Usado como JTI

  @Column()
  @Index()  // ✅ Índice para búsquedas por usuario
  userId: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'uuid', nullable: true })
  replacedBy: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true, type: 'text' })
  userAgent: string;
}
