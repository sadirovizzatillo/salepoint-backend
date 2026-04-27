import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLevel, StockMovement } from './entities/inventory.entity';
import { StorageItem } from './entities/storage.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Product } from '@modules/products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockLevel, StockMovement, StorageItem, Product])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
