import { BadRequestException } from '@nestjs/common';
import { Product } from '../entities/product.entity';
import { UnitType } from '../enums/unit-type.enum';

// Piece-products can only be sold in whole units.
// kg / meter accept up to 3 decimals (enforced by DTO @IsNumber({ maxDecimalPlaces: 3 })).
export function assertQuantityForUnit(product: Product, quantity: number): void {
  if (product.unitType === UnitType.PIECE && !Number.isInteger(quantity)) {
    throw new BadRequestException(
      `Product "${product.name}" is sold by piece — quantity must be a whole number`,
    );
  }
}
