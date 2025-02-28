import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import React, { useState } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { updateMultipleReputations } from '../utils/methods'

interface ValidationFormProps {
  open: boolean
  onClose: () => void
  addresses: string[]
}

const ValidationForm: React.FC<ValidationFormProps> = ({ open, onClose, addresses }) => {
  const [selectedAddress, setSelectedAddress] = useState<string[]>([])

  const handleAddressClick = (address: string) => {
    setSelectedAddress((prevSelected) => {
      if (prevSelected.includes(address)) {
        return prevSelected.filter((addr) => addr !== address)
      } else {
        return [...prevSelected, address]
      }
    })
  }

  const handleSubmit = async () => {
    const nonSelectedAddresses = addresses.filter((address) => !selectedAddress.includes(address))

    await updateMultipleReputations(nonSelectedAddresses, selectedAddress)

    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pt: 3 }}>Validate Contributors</DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        <Typography sx={{ mb: 2, textAlign: 'center' }}>Please select if any malicious contributors</Typography>

        <div>
          {addresses.map((address) => (
            <Button
              key={address}
              onClick={() => handleAddressClick(address)}
              variant={selectedAddress.includes(address) ? 'contained' : 'outlined'}
              color={selectedAddress.includes(address) ? 'error' : 'primary'}
              fullWidth
              sx={{
                mb: 1,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: selectedAddress.includes(address) ? 'bold' : 'normal',
              }}
            >
              {ellipseAddress(address)}
            </Button>
          ))}
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
        <Button onClick={handleSubmit} color="primary" variant="contained" sx={{ minWidth: 100 }} fullWidth>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ValidationForm
