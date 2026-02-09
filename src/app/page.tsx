import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Coming Soon
          </h1>
          
          <p className="text-gray-600 mb-6">
            We're working on something exciting. Check back soon for updates!
          </p>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              <p>Expected launch: Q1 2024</p>
              <p>Stay tuned for more information</p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                © 2024 Your Company. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 