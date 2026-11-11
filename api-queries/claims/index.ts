import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';


// ---------------------------------------
// GOODS RECEIVING CLAIMS
// ---------------------------------------


// List Claims

export type GoodsReceivingClaimFilterProps = {
    limit?: number;
    offset?: number;
    search?:string;
};


export interface GoodsReceivingClaimItem {
    id: string;
    goodsReceivingOrderId: string;
    goodsReceivingOrderItemId: string;
    companyStockDetailId: string;
    itemCode: string;
    description: string;
    claimReason: string;
    quantity: number;
    unitCost: number;
    unitClaimExclusive: number;
    taxPercent: number;
}


export interface GoodsReceivingClaimDetails {

    id: string;
    pdfUrl:string
    totalClaimExclusive:number;
    totalClaimInclusive:number;
    companyCreditorId: string;
    CompanyCreditor:{
        name:string;
    }

    goodsReceivingOrderId: string;

    originalGoodsReceivingOrderId: string;

    supplierInvoiceNumber: string;

    originalSupplierInvoiceNumber: string;

    claimDate: string;

    claimReason: string;

    sourceType: string;

    sourceDocumentId: string;

    notes?: string;

    items: GoodsReceivingClaimItem[];

    createdAt: string;

    updatedAt: string;
}



export interface GetGoodsReceivingClaimsResponse {

    success: boolean;

    message: string;

    data: {

        count: number;

        rows: GoodsReceivingClaimDetails[];

    };

}



export async function getGoodsReceivingClaims(
    props: GoodsReceivingClaimFilterProps
): Promise<GetGoodsReceivingClaimsResponse> {


    return (

        await axiosInstance({

            url: apiUrls.goodsReceivingClaims.all.url,

            method: apiUrls.goodsReceivingClaims.all.method,

            data: props,

        })

    ).data;

}



export const useGetGoodsReceivingClaims = (
    props: GoodsReceivingClaimFilterProps
) => {


    return useQuery({

        queryKey:[
            getApiKey(apiUrls.goodsReceivingClaims),
            props
        ],

        queryFn: async () =>
            await getGoodsReceivingClaims(props),

    });

};




// ---------------------------------------
// GET CLAIM BY ID
// ---------------------------------------


export interface GetGoodsReceivingClaimResponse {

    success:boolean;

    message?:string;

    data:GoodsReceivingClaimDetails;

}



export async function getGoodsReceivingClaimById(
    claimId:string
):Promise<GetGoodsReceivingClaimResponse>{


    return (

        await axiosInstance({

            url:apiUrls.goodsReceivingClaims.get.url,

            method:apiUrls.goodsReceivingClaims.get.method,

            data:{
                claimId
            },

        })

    ).data;

}



export const useGetGoodsReceivingClaimById = (
    claimId:string
)=>{


    return useQuery({

        queryKey:[
            getApiKey(apiUrls.goodsReceivingClaims),
            claimId
        ],


        queryFn: async()=> 
            await getGoodsReceivingClaimById(claimId),


        enabled:!!claimId,

    });

};




// ---------------------------------------
// CREATE CLAIM
// ---------------------------------------


export const goodsReceivingClaimItemSchema = z.object({

    goodsReceivingOrderId:z.string(),

    goodsReceivingOrderItemId:z.string(),

    companyStockDetailId:z.string(),

    itemCode:z.string(),

    description:z.string(),

    claimReason:z.string(),

    quantity:z.number(),

    unitCost:z.number(),

    unitClaimExclusive:z.number(),

    taxPercent:z.number(),

});



export const goodsReceivingClaimCreateSchema = z.object({

    companyCreditorId:z.string(),

    goodsReceivingOrderId:z.string(),

    originalGoodsReceivingOrderId:z.string(),

    supplierInvoiceNumber:z.string(),

    originalSupplierInvoiceNumber:z.string(),

    claimDate:z.string(),

    claimReason:z.string(),

    sourceType:z.string(),

    sourceDocumentId:z.string(),

    notes:z.string().optional(),


    items:z.array(
        goodsReceivingClaimItemSchema
    ),


});



export type GoodsReceivingClaimCreateSchema =
    z.infer<
        typeof goodsReceivingClaimCreateSchema
    >;



export type MutateGoodsReceivingClaimResponse = {

    success:boolean;

    message?:string;

    data?:GoodsReceivingClaimDetails;

};




export async function createGoodsReceivingClaim(
    data:GoodsReceivingClaimCreateSchema
):Promise<MutateGoodsReceivingClaimResponse>{


    return (

        await axiosInstance({

            url:apiUrls.goodsReceivingClaims.create.url,

            method:apiUrls.goodsReceivingClaims.create.method,

            data,

        })

    ).data;

}




export const useCreateGoodsReceivingClaim =()=>{


    const queryClient = useQueryClient();



    return useMutation({

        mutationFn:createGoodsReceivingClaim,


        onSuccess:()=>{


            queryClient.invalidateQueries({

                queryKey:[
                    getApiKey(apiUrls.goodsReceivingClaims)
                ]

            });


        },


    });


};