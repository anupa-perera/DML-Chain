import { Box, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'

const Timer: React.FC<{ endDate: Date }> = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  const calculateTimeLeft = useCallback(() => {
    const now = new Date()
    const endDateTime = new Date(endDate)
    const difference = endDateTime.getTime() - now.getTime()
    return difference > 0 ? difference : 0
  }, [endDate])

  useEffect(() => {
    const initialTimeLeft = calculateTimeLeft()
    setTimeLeft(initialTimeLeft)

    const timer = setInterval(() => {
      const updatedTimeLeft = calculateTimeLeft()
      setTimeLeft(updatedTimeLeft)

      if (updatedTimeLeft === 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [calculateTimeLeft])

  const getTimeUnits = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))

    return { days, hours, minutes, seconds }
  }

  const timeUnits = getTimeUnits(timeLeft)

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', color: 'green' }}>
        <Typography>{timeUnits.days.toString().padStart(2, '0')}</Typography>
        <Typography>:</Typography>
        <Typography>{timeUnits.hours.toString().padStart(2, '0')}</Typography>
        <Typography>:</Typography>
        <Typography>{timeUnits.minutes.toString().padStart(2, '0')}</Typography>
        <Typography>:</Typography>
        <Typography>{timeUnits.seconds.toString().padStart(2, '0')}</Typography>
      </Box>
    </Stack>
  )
}

export default Timer
