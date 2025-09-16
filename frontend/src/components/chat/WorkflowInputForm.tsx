import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Send,
  Cancel,
  Help,
  AttachFile,
  CalendarToday,
  AccessTime
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';

interface InputField {
  id: string;
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  defaultValue?: any;
}

interface WorkflowInputRequest {
  id: string;
  workflowId: string;
  executionId: string;
  title: string;
  description?: string;
  fields: InputField[];
  timeout?: number;
  expiresAt?: Date;
}

interface WorkflowInputFormProps {
  inputRequest: WorkflowInputRequest;
  onSubmit: (requestId: string, values: Record<string, any>) => void;
  onCancel: (requestId: string) => void;
}

export const WorkflowInputForm: React.FC<WorkflowInputFormProps> = ({
  inputRequest,
  onSubmit,
  onCancel
}) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Initialize default values
    const defaultValues: Record<string, any> = {};
    inputRequest.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        defaultValues[field.id] = false;
      } else if (field.type === 'radio' && field.options && field.options.length > 0) {
        defaultValues[field.id] = field.options[0];
      } else {
        defaultValues[field.id] = '';
      }
    });
    setValues(defaultValues);

    // Set up timeout countdown
    if (inputRequest.expiresAt) {
      const updateTimeRemaining = () => {
        const now = new Date().getTime();
        const expires = inputRequest.expiresAt!.getTime();
        const remaining = Math.max(0, expires - now);
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          onCancel(inputRequest.id);
        }
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [inputRequest]);

  const validateField = (field: InputField, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const { min, max, pattern, message } = field.validation;
      
      if (field.type === 'number' && value !== '') {
        const numValue = Number(value);
        if (min !== undefined && numValue < min) {
          return message || `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && numValue > max) {
          return message || `${field.label} must be at most ${max}`;
        }
      }

      if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
        if (min !== undefined && value.length < min) {
          return message || `${field.label} must be at least ${min} characters`;
        }
        if (max !== undefined && value.length > max) {
          return message || `${field.label} must be at most ${max} characters`;
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          return message || `${field.label} format is invalid`;
        }
      }

      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    return null;
  };

  const handleValueChange = (fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    
    inputRequest.fields.forEach(field => {
      const error = validateField(field, values[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(inputRequest.id, values);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel(inputRequest.id);
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const renderField = (field: InputField) => {
    const value = values[field.id];
    const error = errors[field.id];
    const hasError = Boolean(error);

    const commonProps = {
      fullWidth: true,
      error: hasError,
      helperText: error || field.helpText,
      required: field.required
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <TextField
            {...commonProps}
            type={field.type}
            label={field.label}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            InputProps={field.helpText ? {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={field.helpText}>
                    <IconButton size="small">
                      <Help fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            } : undefined}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            label={field.label}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            inputProps={{
              min: field.validation?.min,
              max: field.validation?.max
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={4}
            label={field.label}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <FormControl {...commonProps}>
            <FormLabel>{field.label}</FormLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              error={hasError}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl component="fieldset" error={hasError}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <RadioGroup
              value={value || ''}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => handleValueChange(field.id, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'date':
        return (
          <DatePicker
            label={field.label}
            value={value ? new Date(value) : null}
            onChange={(date) => handleValueChange(field.id, date?.toISOString())}
            slotProps={{
              textField: {
                ...commonProps,
                InputProps: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  )
                }
              }
            }}
          />
        );

      case 'time':
        return (
          <TimePicker
            label={field.label}
            value={value ? new Date(value) : null}
            onChange={(time) => handleValueChange(field.id, time?.toISOString())}
            slotProps={{
              textField: {
                ...commonProps,
                InputProps: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTime />
                    </InputAdornment>
                  )
                }
              }
            }}
          />
        );

      case 'file':
        return (
          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFile />}
              fullWidth
              sx={{ mb: 1 }}
            >
              {field.label}
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleValueChange(field.id, file);
                  }
                }}
              />
            </Button>
            {value && (
              <Chip
                label={value.name}
                onDelete={() => handleValueChange(field.id, null)}
                size="small"
              />
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            {inputRequest.title}
          </Typography>
          {inputRequest.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {inputRequest.description}
            </Typography>
          )}
          
          {timeRemaining !== null && (
            <Alert 
              severity={timeRemaining < 60000 ? 'error' : 'warning'} 
              sx={{ mb: 2 }}
            >
              Time remaining: {formatTimeRemaining(timeRemaining)}
            </Alert>
          )}
        </Box>

        {/* Form Fields */}
        <Box component="form" sx={{ '& > *': { mb: 2 } }}>
          {inputRequest.fields.map((field) => (
            <Box key={field.id}>
              {renderField(field)}
            </Box>
          ))}
        </Box>

        {/* Actions */}
        <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={submitting}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || timeRemaining === 0}
            startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
