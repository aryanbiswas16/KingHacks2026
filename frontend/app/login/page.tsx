export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg border border-gray-700">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Sales Copilot
        </h1>

        <form className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 focus:outline-none focus:ring focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 focus:outline-none focus:ring focus:ring-blue-600"
            />
          </div>

          <a
            href="/dashboard"
            className="block text-center w-full bg-blue-600 py-2 rounded hover:bg-blue-700 transition"
          >
            Sign In
          </a>
        </form>
      </div>
    </div>
  );
}
