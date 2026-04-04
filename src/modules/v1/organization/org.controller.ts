import { Request, Response, NextFunction } from 'express';
import { getOrganization, updateOrganization } from './org.service';
import { updateOrganizationSchema } from '@/validations/organization.validation';
import { logError } from '@/utils/logger';
import { successResponse } from '@/utils/apiResponse';
import { audit } from '@/utils/audit.helper';
import { AUDIT_ACTIONS } from '@/constants/auditActions';

export const getOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const organization = await getOrganization(req.tenantId!);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(successResponse(organization, 'Organization retrieved successfully'));
  } catch (error: unknown) {
    logError.general(error as Error, 'Organization retrieval');
    next(error);
  }
};

export const updateOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = updateOrganizationSchema.parse(req.body);

    const organization = await updateOrganization(req.tenantId!, validatedData);

    audit(req, {
      action: AUDIT_ACTIONS.ORG_UPDATED,
      metadata: {
        tenantId: req.tenantId,
        updatedFields: Object.keys(validatedData),
      },
    });

    res.json(successResponse(organization, 'Organization updated successfully'));
  } catch (error: unknown) {
    audit(req, {
      action: AUDIT_ACTIONS.ORG_UPDATE_FAILED,
      metadata: {
        tenantId: req.tenantId,
        reason: error instanceof Error ? error.message : 'unknown',
      },
    });

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        logError.validation(error, '/org');
        return res.status(400).json({ message: error.message, errors: error });
      }
      logError.general(error, 'Organization update');
      return res.status(400).json({ message: error.message });
    }
    logError.general(error as Error, 'Organization update - unexpected error');
    next(error);
  }
};
