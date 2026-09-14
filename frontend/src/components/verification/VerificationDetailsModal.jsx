import React from 'react';
import VerificationDetailDrawer from './VerificationDetailDrawer';

/**
 * Re-export VerificationDetailDrawer as VerificationDetailsModal for compatibility
 */
export default function VerificationDetailsModal(props) {
  return <VerificationDetailDrawer {...props} />;
}
