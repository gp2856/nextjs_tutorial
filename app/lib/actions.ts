'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
    try{
        const { customerId, amount ,status } = UpdateInvoice.parse({
            customerId: formData.get('customerId') as string,
            amount: Number(formData.get('amount')),
            status: formData.get('status') as 'pending' | 'paid',
        });
        const amountInCents = amount * 100;
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
        `;
        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    } catch (error) {
        console.error('Error updating invoice:', error);
        throw error;
    }
}


const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(formData: FormData) {

    try{
        const { customerId, amount ,status } = CreateInvoice.parse({
            customerId: formData.get('customerId') as string,
            amount: Number(formData.get('amount')),
            status: formData.get('status') as 'pending' | 'paid',
        });
        const amountInCents = amount * 100;
        const date = new Date().toISOString().split('T')[0];

        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        ON CONFLICT (id) DO NOTHING
        `;

        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw error;
    }
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        console.error('Error deleting invoice:', error);
        throw error;
    }
}
