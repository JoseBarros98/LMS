export default function UserCard({ user, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
      <div>
        <p className="font-bold text-gray-800">{user.name}</p>
        <p className="font-bold text-gray-800">{user.paternal_surname}</p>
        <p className="font-bold text-gray-800">{user.maternal_surname}</p>
        <p className="text-sm text-gray-500">{user.ci}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
        <p className="text-sm text-gray-500">{user.telefono}</p>
        <p className="text-sm text-gray-500">{user.university}</p>        
        <p className="text-sm text-gray-500">{user.country}</p>        
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
          {user.status ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => onEdit(user)}
          className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-1 rounded-lg text-sm font-semibold">
          Editar
        </button>
        <button onClick={() => onDelete(user.id)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg text-sm font-semibold">
          Eliminar
        </button>
      </div>
    </div>
  )
}