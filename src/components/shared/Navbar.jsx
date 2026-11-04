import React from 'react'

function Navbar() {
  return (
    <nav>
        <ul className='flex justify-around items-center py-4 px-96 bg-amber-600 shadow-md'>
            <li><a href="#" className='font-jakarta font-normal text-base text-white'>Home</a></li>
            <li><a href="#" className='font-jakarta font-normal text-base text-white'>Destination</a></li>
            <h1 className='font-clash font-bold text-3xl text-white-new'>SETAPAK</h1>
            <li><a href="#" className='font-jakarta font-normal text-base text-white'>Plan a trip</a></li>
            <li><a href="#" className='font-jakarta font-normal text-base text-white'>Info</a></li>
        </ul>
    </nav>
  )
}

export default Navbar