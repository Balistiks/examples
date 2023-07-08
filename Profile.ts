import { getApi, postApi } from "../lib/NetworkInterface";
import { Client } from "./Client";
import { APIError, InvalidFormatError, NotFoundError, ClientNotAvailableError } from "./errors";
import { Personality } from "./Personality";
import { ModelObject } from "./ModelObject";

export class Profile extends ModelObject {
    name?: string
    gender?: string
    birthday?: number
    about?: string
    phone?: string
    email?: string
    teleram?: string    // Telegram is also listed in the model
    discord?: string
    city?: string
    Personality?: Personality;

    constructor(data: Profile) {
        super();

        // @ts-ignore
        for (const field of Object.keys(data))
            // @ts-ignore
            this[field] = data[field]
        
        if (data.Personality)
        {
            this.Personality = new Personality(data.Personality);
        }
    }   

    static async getById(id: number, client?: Client): Promise<Profile> {
        if (id <= 0)
            throw new InvalidFormatError('ID cannot be negative');
 
        const data = await getApi('/profile/' + id, undefined, {
            headers: client?.getAuthHeader()
        });

        if (data.error == 'not found') {
            throw new NotFoundError('This profile was not found');
        }
        if (data.error) {
            throw new APIError('Unknown API error: ' + data.error);
        }

        const obj = new Profile(data);
        obj.client = client;
        return obj;
    }

    static async getCompatible(page: number = 0, client: Client): Promise<Profile[]> {
        const data: any = await postApi('/profile/compatible', { 
            page: page 
        }, {
            headers: client.getAuthHeader()
        });
        const obj: Profile[] = [];

        for (const profile in data.profile) {
            obj.push(new Profile(data.profile[profile]));
        }
        return obj;
    }

    async updateData(data: {}, client?: Client): Promise<Profile> {
        if (client === undefined && this.client === undefined) {
            throw new ClientNotAvailableError('Client not available');
        }
        if (client !== undefined) this.client = client;

        const profile = await postApi('/profile/update_data', data, { headers: client?.getAuthHeader() });
        return profile;
    }

    async updateTraits(type: number, traits: [], client?: Client): Promise<Profile> {
        if (client === undefined && this.client === undefined) {
            throw new ClientNotAvailableError('Client not available');
        }
        if (client !== undefined) this.client = client;

        const profile = await postApi('/profile/update_traits', {'type': type, 'traits': traits}, { headers: client?.getAuthHeader() });
        return profile;
    }
}