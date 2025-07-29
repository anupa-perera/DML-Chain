import React from 'react'
import { Box, Container } from '@mui/material'
import PaymentTypes from './PaymentTypes'

const PaymentTypesDemo: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PaymentTypes />
    </Container>
  )
}

export default PaymentTypesDemo