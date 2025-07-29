import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  DragIndicator as DragIcon,
  MoreHoriz as MoreIcon,
} from '@mui/icons-material'

interface PaymentType {
  id: string
  name: string
  type: 'Card' | 'Cash' | 'Other' | 'Wallets'
  status: 'Active' | 'Hidden'
  isDefault?: boolean
}

const PaymentTypes: React.FC = () => {
  const [defaultPaymentTypes] = useState<PaymentType[]>([
    { id: '1', name: 'Stripe - Visa, Master, AMEX', type: 'Card', status: 'Active', isDefault: true },
    { id: '2', name: 'Cash', type: 'Cash', status: 'Active', isDefault: true },
  ])

  const [otherPaymentTypes, setOtherPaymentTypes] = useState<PaymentType[]>([
    { id: '3', name: 'Union Pay', type: 'Card', status: 'Hidden' },
    { id: '4', name: 'Installment', type: 'Cash', status: 'Active' },
    { id: '5', name: 'Vouchers', type: 'Other', status: 'Active' },
    { id: '6', name: 'Nets', type: 'Wallets', status: 'Active' },
    { id: '7', name: 'Flash Deal', type: 'Other', status: 'Active' },
    { id: '8', name: 'Coupon', type: 'Cash', status: 'Active' },
    { id: '9', name: 'Lottery (Cash)', type: 'Cash', status: 'Active' },
    { id: '10', name: 'Black Friday Offer', type: 'Cash', status: 'Active' },
    { id: '11', name: 'Christmas Offer', type: 'Card', status: 'Active' },
    { id: '12', name: 'Easter Offers', type: 'Wallets', status: 'Active' },
    { id: '13', name: 'Vesak Offers', type: 'Other', status: 'Active' },
    { id: '14', name: 'Offer', type: 'Cash', status: 'Active' },
  ])

  const [openDialog, setOpenDialog] = useState(false)
  const [newPaymentType, setNewPaymentType] = useState({
    name: '',
    type: 'Cash' as PaymentType['type'],
    status: 'Active' as PaymentType['status'],
  })

  const handleAddPaymentType = () => {
    if (newPaymentType.name.trim()) {
      const newType: PaymentType = {
        id: Date.now().toString(),
        name: newPaymentType.name,
        type: newPaymentType.type,
        status: newPaymentType.status,
      }
      setOtherPaymentTypes([...otherPaymentTypes, newType])
      setNewPaymentType({ name: '', type: 'Cash', status: 'Active' })
      setOpenDialog(false)
    }
  }

  const toggleStatus = (id: string) => {
    setOtherPaymentTypes(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: item.status === 'Active' ? 'Hidden' : 'Active' }
          : item
      )
    )
  }

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'success' : 'default'
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Card': return '#1976d2'
      case 'Cash': return '#2e7d32'
      case 'Wallets': return '#ed6c02'
      case 'Other': return '#9c27b0'
      default: return '#757575'
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>
            Payment Types
          </Typography>
          <Typography variant="body1" sx={{ color: '#666' }}>
            Create and edit the payment types allowed in your restaurant.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            backgroundColor: '#ff7043',
            '&:hover': { backgroundColor: '#f4511e' },
            borderRadius: 2,
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Add Payment Type
        </Button>
      </Box>

      {/* Default Payment Types */}
      <Box sx={{ mb: 4 }}>
        {defaultPaymentTypes.map((paymentType) => (
          <Card
            key={paymentType.id}
            sx={{
              mb: 2,
              border: '1px solid #e0e0e0',
              boxShadow: 'none',
              '&:hover': { boxShadow: 1 },
            }}
          >
            <CardContent sx={{ py: 2, px: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ color: '#333' }}>
                  {paymentType.name} (default)
                </Typography>
                <Chip
                  label={paymentType.status}
                  color={getStatusColor(paymentType.status) as any}
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Others Section */}
      <Typography variant="h5" sx={{ fontWeight: 600, color: '#333', mb: 3 }}>
        Others
      </Typography>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#fafafa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#666', width: 60 }}>Move</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666' }}>NAME</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', textAlign: 'center' }}>PAYMENT TYPE</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', textAlign: 'center' }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#666', width: 60 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {otherPaymentTypes.map((paymentType) => (
              <TableRow
                key={paymentType.id}
                sx={{
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <TableCell>
                  <IconButton size="small" sx={{ color: '#999' }}>
                    <DragIcon />
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#333', fontWeight: 500 }}>
                    {paymentType.name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    label={paymentType.type}
                    size="small"
                    sx={{
                      backgroundColor: getTypeColor(paymentType.type),
                      color: 'white',
                      fontWeight: 500,
                      minWidth: 80,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    label={paymentType.status}
                    color={getStatusColor(paymentType.status) as any}
                    size="small"
                    onClick={() => toggleStatus(paymentType.id)}
                    sx={{ 
                      fontWeight: 500,
                      cursor: 'pointer',
                      minWidth: 70,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" sx={{ color: '#999' }}>
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Payment Type Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Add New Payment Type</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Payment Type Name"
            value={newPaymentType.name}
            onChange={(e) => setNewPaymentType({ ...newPaymentType, name: e.target.value })}
            sx={{ mb: 3 }}
          />
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Payment Type</InputLabel>
            <Select
              value={newPaymentType.type}
              label="Payment Type"
              onChange={(e) => setNewPaymentType({ ...newPaymentType, type: e.target.value as PaymentType['type'] })}
            >
              <MenuItem value="Card">Card</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Wallets">Wallets</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={newPaymentType.status}
              label="Status"
              onChange={(e) => setNewPaymentType({ ...newPaymentType, status: e.target.value as PaymentType['status'] })}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Hidden">Hidden</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: '#666' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPaymentType}
            variant="contained"
            sx={{
              backgroundColor: '#ff7043',
              '&:hover': { backgroundColor: '#f4511e' },
            }}
          >
            Add Payment Type
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PaymentTypes