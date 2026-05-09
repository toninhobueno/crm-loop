/**
 * @TercioSantos-0 |
 * model/CompaniesSettings |
 * @descrição:modelo para tratar as configurações das empresas
 */
import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "CompaniesSettings" })
class CompaniesSettings extends Model<CompaniesSettings> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  hoursCloseTicketsAuto: string;

  @Column
  chatBotType: string;

  @Column
  acceptCallWhatsapp: string;

  //inicio de opções: enabled ou disabled
  @Column
  userRandom: string;

  @Column
  sendGreetingMessageOneQueues: string;

  @Column
  sendSignMessage: string;

  @Column
  sendFarewellWaitingTicket: string;

  @Column
  userRating: string;

  @Column
  sendGreetingAccepted: string;

  @Column
  CheckMsgIsGroup: string;

  @Column
  sendQueuePosition: string;

  @Column
  scheduleType: string;

  @Column
  acceptAudioMessageContact: string;

  @Column
  sendMsgTransfTicket: string;

  @Column
  enableLGPD: string;

  @Column
  requiredTag: string;

  @Column
  lgpdDeleteMessage: string;

  @Column
  lgpdHideNumber: string;

  @Column
  lgpdConsent: string;

  @Column
  lgpdLink: string;

  //fim de opções: enabled ou disabled
  @Column
  lgpdMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Default(false)
  @Column
  DirectTicketsToWallets: boolean;

  @Default(false)
  @Column
  closeTicketOnTransfer: boolean;

  @Column
  transferMessage: string;

  @Column
  greetingAcceptedMessage: string;

  @Column
  AcceptCallWhatsappMessage: string;

  @Column
  sendQueuePositionMessage: string;

  @Column
  showNotificationPending: boolean;

  @Default(false)
  @Column
  informarValorVenda: boolean;

  @Column
  motivosFinalizacao: string; // JSON string com array de motivos padrão

  // WAVOIP Configuration
  @Column
  wavoipUrl: string;

  @Column
  wavoipUsername: string;

  @Column
  wavoipPassword: string;

  // ===================================================================
  // BACKUP SETTINGS
  // ===================================================================

  @Default(false)
  @Column
  backupEnabled: boolean; // Habilitar backups automáticos

  @Default("daily")
  @Column
  backupFrequency: string; // Frequência: daily, weekly, monthly

  @Default("02:00")
  @Column
  backupTime: string; // Horário para executar backup (HH:mm)

  @Default(true)
  @Column
  backupDatabase: boolean; // Fazer backup do banco de dados

  @Default(true)
  @Column
  backupFiles: boolean; // Fazer backup de arquivos

  @Default(30)
  @Column
  backupRetentionDays: number; // Dias para manter backups

  @Column
  backupCloudProvider: string; // Provider: s3, google-drive, dropbox, local

  @Column(DataType.JSON)
  backupCloudConfig: object; // Configuração do provider (credentials, etc)

  @Column
  backupLastRun: Date; // Última execução bem-sucedida

  @Column
  backupLastStatus: string; // Status: success, failed, running

  @Column
  backupLastError: string; // Mensagem de erro do último backup

  // NOTIFICAMEHUB SETTINGS
  // ===================================================================

  @Column(DataType.TEXT)
  notificamehubToken: string; // Token geral da API NotificameHub
}

export default CompaniesSettings;
