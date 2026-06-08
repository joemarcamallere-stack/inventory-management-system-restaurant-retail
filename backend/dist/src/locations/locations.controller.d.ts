import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    create(createLocationDto: CreateLocationDto, currentUser: AuthenticatedUser): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    }>;
    findAll(currentUser: AuthenticatedUser): Promise<(Omit<{
        _count: {
            items: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    })[]>;
    findOne(id: string, currentUser: AuthenticatedUser): Promise<Omit<{
        _count: {
            items: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    }>;
    update(id: string, updateLocationDto: UpdateLocationDto, currentUser: AuthenticatedUser): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    }>;
    remove(id: string, currentUser: AuthenticatedUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }>;
}
