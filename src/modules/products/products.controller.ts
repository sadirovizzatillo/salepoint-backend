import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, ProductQueryDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ConfirmImageDto, RequestImageUploadDto } from './dto/image-upload.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(dto, user.shopId!);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination, search, filters' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ProductQueryDto) {
    return this.productsService.findAll(user.shopId ?? null, query);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Barcode lookup — POS scanner' })
  findByBarcode(@Param('barcode') barcode: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findByBarcode(barcode, user.shopId!);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findById(id, user.shopId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SHOP_OWNER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.update(id, dto, user.shopId!);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SHOP_OWNER)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user.shopId!);
  }

  @Post(':id/image/upload-url')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Get a pre-signed URL for direct image upload to Spaces' })
  requestImageUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestImageUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.createImageUploadUrl(id, user.shopId!, dto);
  }

  @Patch(':id/image')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Confirm an uploaded image and attach it to the product' })
  confirmImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmImageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.confirmImage(id, user.shopId!, dto.key);
  }

  @Delete(':id/image')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Remove product image' })
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.removeImage(id, user.shopId!);
  }
}
