import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from './api/users'
import { useAuth } from './context/AuthContext'
import UserForm from './components/UserForm'
import UserCard from './components/UserCard'
import Layout from './components/Layout'

export default function App() {
  const { logout, user, refreshUser } = useAuth()
  const [users, setUsers] = useState([])
  const [userEdit, setUserEdit] = useState(null)

  const fetchUsers = async () => {
    const res = await getUsers()
    setUsers(res.data)
  }

  useEffect(() => {fetchUsers() }, [])

  const handleSubmit = async (formData) => {
    
    try {
      if (userEdit) {
        await updateUser(userEdit.id, formData)
        setUserEdit(null)
        if (userEdit.id === user?.user_id) {
          await refreshUser()
        }
      } else {
        await createUser(formData)
      }
      fetchUsers()
    } catch (error) {
        console.log('Error al enviar los datos:', error.response.data)
      }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteUser(id)
      fetchUsers()
    }
  }

  return (
    <Layout>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <img src="/1.png" alt="Imagen" className="w-full h-full rounded-lg object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-6">Bienvenido {user?.name} {user?.paternal_surname} {user?.maternal_surname}</h1>
          <p className="mb-6">
            Nos alegra tenerte aquí. En esta plataforma, encontrarás una variedad de cursos diseñados para ayudarte a crecer profesional y personalmente.
            <br />
            Explora tus cursos asignados, continúa tu aprendizaje a tu propio ritmo y accede a contenido actualizado que se adapta a tus necesidades.
            <br />
            Estamos comprometidos a brindarte la mejor experiencia educativa posible. Si tienes alguna duda o necesitas ayuda, no dudes en contactarnos.
          </p>

          <div className="mt-6">
            <button
              onClick={() => logout()}
              className="bg-trasnparent text-black px-4 py-2 rounded hover:bg-gray-300 border border-gray-300"
            >
              Ir a Perfil
            </button>
            <button
              onClick={() => logout()}
              className="bg-transparent text-black px-4 py-2 rounded hover:bg-gray-300 border border-gray-300 ml-4"
            >
              Ver Calendario
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">Mis Cursos</h1>
      </div>
    </Layout>
  )
}