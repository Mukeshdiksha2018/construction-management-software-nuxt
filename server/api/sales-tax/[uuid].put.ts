import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody(event);
    const { tax_name, tax_percentage, status } = body;

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Sales Tax UUID is required'
      });
    }

    // Validate required fields
    if (!tax_name || tax_name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tax Name is required'
      });
    }

    if (tax_percentage === undefined || tax_percentage === null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tax Percentage is required'
      });
    }

    const taxPercentageNum = Number(tax_percentage);
    if (isNaN(taxPercentageNum) || taxPercentageNum < 0 || taxPercentageNum > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tax Percentage must be a number between 0 and 100'
      });
    }

    // Validate status
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Status must be either ACTIVE or INACTIVE'
      });
    }

    const supabase = supabaseServer;

    const { data, error } = await supabase
      .from('sales_tax')
      .update({
        tax_name: tax_name.trim(),
        tax_percentage: taxPercentageNum,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', uuid)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update sales tax'
      });
    }

    return {
      success: true,
      data,
      message: 'Sales tax updated successfully'
    };
  } catch (error: any) {
    console.error('Error in Sales Tax PUT API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});

