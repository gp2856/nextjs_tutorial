'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number()
    .gt(0, {message: 'Please enter an amount greater than 0.'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    }
    message?: string | null;
};

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(
        id: string,
        prevState: State,
        formData: FormData
) {
        const ValidatedFields = UpdateInvoice.safeParse({
            customerId: formData.get('customerId') as string,
            amount: Number(formData.get('amount')),
            status: formData.get('status') as 'pending' | 'paid',
        });
        
        if (!ValidatedFields.success) {
            return { errors: ValidatedFields.error.flatten().fieldErrors, message: 'Missing fields.  Failed to update invoice.'}
        }

        const { customerId, amount, status } = ValidatedFields.data;
        const amountInCents = amount * 100;

            try{
                await sql`
                UPDATE invoices
                SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
                WHERE id = ${id}
                `;
                revalidatePath('/dashboard/invoices');
                redirect('/dashboard/invoices');
            } catch (error) {
                return { errors: { message: 'Database Error updating invoice'}, message: 'Error updating invoice'};
            }
}


const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State, formData: FormData) {

    const ValidatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId') as string,
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!ValidatedFields.success) {
        return {
            errors: ValidatedFields.error.flatten().fieldErrors,
            message: 'Missing fields.  Failed to create invoice.',
        }
    }
        const { customerId, amount ,status } = CreateInvoice.parse({
            customerId: formData.get('customerId') as string,
            amount: Number(formData.get('amount')),
            status: formData.get('status') as 'pending' | 'paid',
        });
        const amountInCents = amount * 100;
        const date = new Date().toISOString().split('T')[0];

    try{
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;

    } catch (error) {
        return {
            message: 'Database Error.  Failed to create invoice.',
        };
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
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
