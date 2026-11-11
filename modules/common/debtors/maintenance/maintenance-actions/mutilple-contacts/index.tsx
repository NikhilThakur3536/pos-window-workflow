import { useState } from 'react';
import { Button } from '@/components/ui/button';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import AddEditContactForm from './add-edit-contact';

interface Contact {
    id: string;
    branch: string;
    name: string;
    contactName: string;
    contactNumber: string;
    address1: string;
    address2: string;
    address3: string;
    address4: string;
    postalCode: string;
    cellphoneNumber: string;
    faxNumber: string;
    emailAddress: string;
    useEmailAddressFor: boolean;
    selectModules: string;
    preferredTaxRate: string;
}

const MultipleContacts = () => {
    const [contacts, setContacts] = useState<Contact[]>([
        {
            id: '1',
            branch: 'BN',
            name: 'Main Contact',
            contactName: 'John Doe',
            contactNumber: '123-456-7890',
            address1: '123 Main St',
            address2: 'Suite 100',
            address3: 'Downtown',
            address4: 'City',
            postalCode: '12345',
            cellphoneNumber: '555-1234',
            faxNumber: '555-5678',
            emailAddress: 'main@example.com',
            useEmailAddressFor: true,
            selectModules: 'Module 1',
            preferredTaxRate: '15%',
        },
        {
            id: '2',
            branch: 'HQ',
            name: 'Head Office',
            contactName: 'Jane Smith',
            contactNumber: '098-765-4321',
            address1: '456 Corporate Ave',
            address2: 'Floor 5',
            address3: 'Business Park',
            address4: 'Metropolis',
            postalCode: '67890',
            cellphoneNumber: '555-9876',
            faxNumber: '555-4321',
            emailAddress: 'hq@example.com',
            useEmailAddressFor: false,
            selectModules: 'Module 2',
            preferredTaxRate: '0%',
        },
        {
            id: '3',
            branch: 'BR1',
            name: 'Branch One',
            contactName: 'Peter Jones',
            contactNumber: '112-233-4455',
            address1: '789 Branch Rd',
            address2: '',
            address3: '',
            address4: '',
            postalCode: '11223',
            cellphoneNumber: '555-1122',
            faxNumber: '555-3344',
            emailAddress: 'branch1@example.com',
            useEmailAddressFor: true,
            selectModules: 'Module 1',
            preferredTaxRate: '15%',
        },
    ]);
    const [showForm, setShowForm] = useState(false);
    const [currentContact, setCurrentContact] = useState<Contact | undefined>(undefined);

    const handleSaveContact = (data: Omit<Contact, 'id'> & { id?: string }) => {
        if (data.id) {
            setContacts((prev) => prev.map((c) => (c.id === data.id ? (data as Contact) : c)));
        } else {
            const newContact: Contact = {
                ...data,
                id: String(contacts.length + 1),
            };
            setContacts((prev) => [...prev, newContact]);
        }
        setShowForm(false);
        setCurrentContact(undefined);
    };

    const handleDeleteContact = (id: string) => {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        if (currentContact?.id === id) {
            setShowForm(false);
            setCurrentContact(undefined);
        }
    };

    const openAddForm = () => {
        setCurrentContact(undefined);
        setShowForm(true);
    };

    const openEditForm = (contact: Contact) => {
        setCurrentContact(contact);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setCurrentContact(undefined);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for Multiple Contacts');
    };

    const handleAccept = () => {
        console.log('Multiple Contacts Accepted:', contacts);
    };

    return (
        <div className="relative flex h-full overflow-hidden">
            <div className="absolute inset-0 bottom-16 overflow-auto p-2">
                {!showForm ? (
                    <>
                        <div className="mb-4 flex justify-end gap-2">
                            <Button type="button" onClick={openAddForm} className="h-8 text-sm">
                                <PlusIcon className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>

                        <div className="rounded-md border bg-white">
                            <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_80px_80px] items-center gap-2 border-b p-2 text-xs font-semibold">
                                <div className="text-sm">Branch</div>
                                <div className="text-sm">Name</div>
                                <div className="text-sm">Address 1</div>
                                <div className="text-sm">Address 2</div>
                                <div className="text-sm">Address 3</div>
                                <div className="text-sm">Address 4</div>
                                <div className="text-center text-sm">Edit</div>
                                <div className="text-center text-sm">Delete</div>
                            </div>
                            {contacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_80px_80px] items-center gap-2 border-b px-2 py-1 text-xs last:border-b-0"
                                >
                                    <div className="truncate">{contact.branch}</div>
                                    <div className="truncate">{contact.name}</div>
                                    <div className="truncate">{contact.address1}</div>
                                    <div className="truncate">{contact.address2}</div>
                                    <div className="truncate">{contact.address3}</div>
                                    <div className="truncate">{contact.address4}</div>
                                    <div className="flex justify-center">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditForm(contact)}
                                            className="h-7 w-7"
                                        >
                                            <PencilIcon className="h-4 w-4 text-gray-500" />
                                        </Button>
                                    </div>
                                    <div className="flex justify-center">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteContact(contact.id)}
                                            className="h-7 w-7"
                                        >
                                            <Trash2Icon className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <AddEditContactForm
                        initialData={currentContact}
                        onSave={handleSaveContact}
                        onCancel={handleCancelForm}
                    />
                )}
            </div>

            <div className="absolute right-0 bottom-0 left-0">
                <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept} />
            </div>
        </div>
    );
};

export default MultipleContacts;
