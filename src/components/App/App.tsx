import { useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import Loader from '../Loader/Loader';
import Modal from '../Modal/Modal';
import NoteForm from '../NoteForm/NoteForm';
import NoteList from '../NoteList/NoteList';
import Pagination from '../Pagination/Pagination';
import SearchBox from '../SearchBox/SearchBox';
import { createNote, deleteNote, fetchNotes } from '../../services/noteService';
import type { CreateNoteParams } from '../../services/noteService';
import css from './App.module.css';

const NOTES_PER_PAGE = 12;

export default function App() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes', page, search],
    queryFn: () =>
      fetchNotes({
        page,
        perPage: NOTES_PER_PAGE,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async () => {
      if (data?.notes.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      }

      await queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleSearch = useDebouncedCallback((value: string): void => {
    setSearch(value.trim());
    setPage(1);
  }, 300);

  const handleCreateNote = async (values: CreateNoteParams): Promise<void> => {
    await createMutation.mutateAsync(values);
  };

  const handleDeleteNote = (noteId: string): void => {
    deleteMutation.mutate(noteId);
  };

  const handleOpenModal = (): void => {
    createMutation.reset();
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    if (!createMutation.isPending) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className={css.app}>
      <header className={css.toolbar}>
        <SearchBox onSearch={handleSearch} />
        {data && data.totalPages > 1 && (
          <Pagination
            pageCount={data.totalPages}
            currentPage={page}
            onPageChange={setPage}
          />
        )}
        <button className={css.button} type="button" onClick={handleOpenModal}>
          Create note +
        </button>
      </header>

      {isLoading && <Loader />}
      {isError && <ErrorMessage message="Could not fetch notes." />}
      {deleteMutation.isError && (
        <ErrorMessage message="Could not delete the note." />
      )}

      {data && data.notes.length > 0 && (
        <NoteList
          notes={data.notes}
          onDelete={handleDeleteNote}
          deletingNoteId={
            deleteMutation.isPending ? deleteMutation.variables : undefined
          }
        />
      )}

      {data && data.notes.length === 0 && !isLoading && !isError && (
        <p className={css.empty}>No notes found.</p>
      )}

      {isModalOpen && (
        <Modal onClose={handleCloseModal}>
          {createMutation.isError && (
            <ErrorMessage message="Could not create the note." />
          )}
          <NoteForm
            onSubmit={handleCreateNote}
            onCancel={handleCloseModal}
            isSubmitting={createMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
