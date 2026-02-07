'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Store, 
  CreditCard, 
  Receipt, 
  Wallet, 
  Package,
  ClipboardCheck
} from 'lucide-react';
import { StepShopDate } from '@/components/daily-closing/step-shop-date';
import type { WizardData } from '@/types/daily-closing';
import { initialWizardData } from '@/types/daily-closing';

// Steps configuration
const STEPS = [
  { id: 1, name: 'Shop & Date', icon: Store },
  { id: 2, name: 'Sales', icon: CreditCard },
  { id: 3, name: 'Expenses', icon: Receipt },
  { id: 4, name: 'Cash', icon: Wallet },
  { id: 5, name: 'Inventory', icon: Package },
  { id: 6, name: 'Review', icon: ClipboardCheck },
] as const;

export default function DailyClosingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Wizard state - using proper types
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    // Only allow going to completed steps or current+1
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  // Check if current step is valid to proceed
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!wizardData.shopId && !!wizardData.logDate && !wizardData.existingLogId;
      case 2:
        return wizardData.salesEntries.length > 0 || wizardData.grossSales >= 0;
      case 3:
        return true; // Expenses are optional
      case 4:
        return wizardData.actualClosing >= 0;
      case 5:
        return true; // Inventory is optional for now
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Daily Closing</h1>
        <p className="text-muted-foreground">
          Complete end-of-day reconciliation for your shop
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <button
                onClick={() => goToStep(step.id)}
                disabled={step.id > currentStep}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  transition-colors duration-200
                  ${isCompleted 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : isCurrent 
                      ? 'border-primary text-primary' 
                      : 'border-muted text-muted-foreground'
                  }
                  ${step.id <= currentStep ? 'cursor-pointer hover:bg-primary/10' : 'cursor-not-allowed'}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </button>
              
              {/* Step Label (hidden on mobile) */}
              <span className={`
                ml-2 text-sm font-medium hidden sm:inline
                ${isCurrent ? 'text-primary' : 'text-muted-foreground'}
              `}>
                {step.name}
              </span>
              
              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className={`
                  w-8 sm:w-16 h-0.5 mx-2
                  ${isCompleted ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const CurrentIcon = STEPS[currentStep - 1].icon;
              return <CurrentIcon className="w-5 h-5" />;
            })()}
            Step {currentStep}: {STEPS[currentStep - 1].name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step components will be rendered here */}
          {currentStep === 1 && (
            <StepShopDate 
              data={wizardData} 
              onUpdate={updateWizardData} 
            />
          )}
          {currentStep === 2 && (
            <StepSales 
              data={wizardData} 
              onUpdate={updateWizardData} 
            />
          )}
          {currentStep === 3 && (
            <StepExpenses 
              data={wizardData} 
              onUpdate={updateWizardData} 
            />
          )}
          {currentStep === 4 && (
            <StepCashRecon 
              data={wizardData} 
              onUpdate={updateWizardData} 
            />
          )}
          {currentStep === 5 && (
            <StepInventory 
              data={wizardData} 
              onUpdate={updateWizardData} 
            />
          )}
          {currentStep === 6 && (
            <StepReview 
              data={wizardData} 
              onUpdate={updateWizardData} 
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep < STEPS.length ? (
          <Button 
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={() => {
              // TODO: Submit logic
              console.log('Submitting:', wizardData);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Daily Closing
          </Button>
        )}
      </div>
    </div>
  );
}

// Placeholder components - we'll build these next
function StepSales({ data, onUpdate }: { data: WizardData; onUpdate: (updates: Partial<WizardData>) => void }) {
  return <div className="py-8 text-center text-muted-foreground">Step 2: Sales Entry (Building next...)</div>;
}

function StepExpenses({ data, onUpdate }: { data: WizardData; onUpdate: (updates: Partial<WizardData>) => void }) {
  return <div className="py-8 text-center text-muted-foreground">Step 3: Expenses</div>;
}

function StepCashRecon({ data, onUpdate }: { data: WizardData; onUpdate: (updates: Partial<WizardData>) => void }) {
  return <div className="py-8 text-center text-muted-foreground">Step 4: Cash Reconciliation</div>;
}

function StepInventory({ data, onUpdate }: { data: WizardData; onUpdate: (updates: Partial<WizardData>) => void }) {
  return <div className="py-8 text-center text-muted-foreground">Step 5: Inventory</div>;
}

function StepReview({ data, onUpdate }: { data: WizardData; onUpdate: (updates: Partial<WizardData>) => void }) {
  return <div className="py-8 text-center text-muted-foreground">Step 6: Review & Submit</div>;
}