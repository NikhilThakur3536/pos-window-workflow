import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle, AlertCircle, 
  ExternalLink, X, ArrowRight, ArrowLeft,
  Package, ClipboardList, TrendingUp, DollarSign, Tag, Handshake
} from 'lucide-react';

type ModuleType =
  | 'stock' | 'inventory' | 'markup' | 'pricing' 
  | 'promotion-retail' | 'promotion-wholesale';

interface UserInfo {
  domainId: string;
  companyId: string;
  userId: string;
}

const modules = [
  { 
    key: 'stock', 
    label: 'Stock', 
    icon: Package, 
    desc: 'Inventory levels & counts' 
  },
  { 
    key: 'inventory', 
    label: 'Inventory', 
    icon: ClipboardList, 
    desc: 'Product master data' 
  },
  { 
    key: 'markup', 
    label: 'Markup', 
    icon: TrendingUp, 
    desc: 'Cost & margin rules' 
  },
  { 
    key: 'pricing', 
    label: 'Pricing', 
    icon: DollarSign, 
    desc: 'Retail price lists' 
  },
  { 
    key: 'promotion-retail', 
    label: 'Retail Promo', 
    icon: Tag, 
    desc: 'Consumer offers' 
  },
  { 
    key: 'promotion-wholesale', 
    label: 'Wholesale Promo', 
    icon: Handshake, 
    desc: 'B2B promotions' 
  },
];

const ImportPage = () => {
  const [selectedModule, setSelectedModule] = useState<ModuleType | "">("");
  const [filePath, setFilePath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [importedPath, setImportedPath] = useState<string>('');
  const [step, setStep] = useState(1);

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nextStep = () => {
    if (step === 1 && !selectedModule) {
      showError('Please select a module');
      return;
    }

    if (step === 2 && !filePath) {
      showError('Please select a CSV file');
      return;
    }

    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Load user info
  useEffect(() => {
    const stored = localStorage.getItem('pos-auth-store');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        setUserInfo({
          domainId: state?.state?.user?.domainId || '',
          companyId: state.state?.user?.companyId || '',
          userId: state.state?.user?.id || ''
        });
      } catch (e) {
        console.error("Failed to parse pos-auth-store", e);
      }
    }
  }, []);

  const formatDateTime = (): string => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_` +
           `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  };

//   const handleBrowseFile = async () => {
//     try {
//       const selectedPath = await (window as any).electronAPI.selectFile();
//       if (!selectedPath) return;

//       setFilePath(selectedPath);
//       const name = selectedPath.split('\\').pop() || selectedPath.split('/').pop() || '';
//       setFileName(name);
//       useEffect(() => {
//   if (step === 2 && filePath) {
//     setStep(3);
//   }
// }, [filePath, step]);
//     } catch (error) {
//       showError('Failed to select file');
//     }
//   };

const handleBrowseFile = async () => {
  try {
    const selectedPath = await window.electronAPI.selectFile();
    if (!selectedPath) return;

    const name =
      selectedPath.split('\\').pop() ||
      selectedPath.split('/').pop() ||
      '';

    setFilePath(selectedPath);
    setFileName(name);

    // Move directly to step 3
    setStep(3);
  } catch (error) {
    showError('Failed to select file');
  }
};

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.toLowerCase().endsWith('.csv')) {
      setFileName(droppedFile.name);
      setFilePath(droppedFile.path || '');
      setTimeout(() => {
      if (step === 2) nextStep();
    }, 300);
    } else {
      showError('Please drop a valid .csv file');
    }
  };

  const clearFile = () => {
    setFilePath('');
    setFileName('');
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorModal(true);
  };

  const handleImport = async () => {
    if (!selectedModule || !filePath) {
      showError('Please select a module and a CSV file');
      return;
    }
    if (!userInfo) {
      showError('User information not found');
      return;
    }

    setIsLoading(true);

    const { domainId, companyId, userId } = userInfo;
    const datetime = formatDateTime();
    const newFileName = `${selectedModule}_${domainId}_${companyId}_${userId}_${datetime}.csv`;

    try {
      const result = await (window as any).electronAPI.saveToFolder({
        filePath,
        newFileName,
        moduleType: selectedModule,
      });

      if (result.success) {
        setImportedPath(result.path || '');
        setShowSuccessModal(true);
      } else {
        showError(result.error || 'Import failed');
      }
    } catch (err: any) {
      showError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedModule('');
    setFilePath('');
    setFileName('');
    setImportedPath('');
    setShowSuccessModal(false);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-50 to-zinc-100 overflow-hidden flex items-center justify-center ">
      <div className="w-full  h-[100vh] flex flex-col">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 border-b">
            <h1 className="text-2xl font-semibold text-center text-gray-900">
              Data Import Center
            </h1>
            <p className="text-center text-gray-500 mt-2">
              Import your CSV in 3 simple steps
            </p>
          </div>

          {/* Progress */}
          <div className="px-8 pt-4">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((s, index) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                    ${step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s}
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-20 h-1 mx-3 rounded-full transition-all
                      ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="flex justify-center gap-16 mt-1 text-sm text-gray-500">
              <span>Module</span>
              <span>Upload</span>
              <span>Review</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto overflow-y-hidden">
            {/* STEP 1: Module Selection */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4 w-full max-w-3xl ">
                {modules.map((mod) => {
                  const IconComponent = mod.icon;
                  return (
                    <button
                      key={mod.key}
                      onClick={() => setSelectedModule(mod.key as ModuleType)}
                      className={`p-6 rounded-3xl border text-left transition-all group
                      ${selectedModule === mod.key
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                          ${selectedModule === mod.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'}`}>
                          <IconComponent className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{mod.label}</div>
                          <div className="text-sm text-gray-500 mt-1">{mod.desc}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP 2: File Upload */}
            {step === 2 && (
              <div className="w-full max-w-2xl">
                <div
                  className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer min-h-[380px] flex flex-col items-center justify-center
                  ${isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={handleBrowseFile}
                >
                  <Upload className="w-16 h-16 text-gray-400 mb-6" />
                  
                  <h3 className="text-2xl font-medium text-gray-800">Drop CSV file here</h3>
                  <p className="text-gray-500 mt-2 mb-8">or click to browse your computer</p>

                  <div className="px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors">
                    <FileText className="w-5 h-5" />
                    Browse Files
                  </div>
                </div>

                {/* {fileName && (
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-emerald-50 border border-emerald-200 shadow-xl rounded-3xl p-6 flex items-center justify-between mx-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{fileName}</p>
              <p className="text-xs text-emerald-600">CSV file • Ready to import</p>
            </div>
          </div>

          <button
            onClick={clearFile}
            className="text-gray-400 hover:text-red-500 p-1 transition-colors rounded-lg hover:bg-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    )}
   */}
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <div className="w-full max-w-lg space-y-6">
                <div className="p-6 border border-gray-200 rounded-3xl">
                  <p className="text-sm text-gray-500 mb-1">Selected Module</p>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const mod = modules.find(m => m.key === selectedModule);
                      const IconComponent = mod?.icon;
                      return (
                        <>
                          {IconComponent && <IconComponent className="w-8 h-8 text-blue-600" />}
                          <p className="font-semibold text-2xl text-gray-900">
                            {mod?.label}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-6 border border-gray-200 rounded-3xl">
                  <p className="text-sm text-gray-500 mb-1">Selected File</p>
                  <p className="font-semibold text-xl text-gray-900 break-all">{fileName}</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-blue-800 font-medium">Ready to import</p>
                      <p className="text-sm text-blue-600 mt-1">
                        The file will be moved to the selected module folder with a timestamp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="p-8 border-t flex items-center justify-between bg-gray-50">
            <button 
              onClick={prevStep} 
              disabled={step === 1}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-2xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            {step < 3 ? (
              <button 
                onClick={nextStep} 
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-medium hover:bg-blue-700 transition-colors"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleImport} 
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70"
              >
                {isLoading ? 'Importing...' : 'Import File'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-10 text-center shadow-2xl">
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            
            <h2 className="text-3xl font-semibold text-gray-900 mb-3">Import Successful!</h2>
            <p className="text-gray-600 mb-8">Your data has been successfully imported.</p>

            {importedPath && (
              <button
                onClick={() => (window as any).electronAPI?.openFolder?.(importedPath)}
                className="w-full py-4 border border-gray-300 hover:bg-gray-50 rounded-2xl flex items-center justify-center gap-3 mb-4 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Open Import Folder
              </button>
            )}

            <button
              onClick={resetForm}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-medium hover:bg-black transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-9 h-9 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Import Failed</h2>
            <p className="text-gray-600 mb-8">{errorMessage}</p>

            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-medium hover:bg-black transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;